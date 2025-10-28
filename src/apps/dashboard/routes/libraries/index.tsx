import React, { useCallback, useMemo, useState } from 'react';
import Page from 'components/Page';
import globalize from 'lib/globalize';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useVirtualFolders } from 'apps/dashboard/features/libraries/api/useVirtualFolders';
import { getLibraryOrder, setLibraryOrder } from 'utils/libraryOrder';
import IconButton from '@mui/material/IconButton';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import useLiveTasks from 'apps/dashboard/features/tasks/hooks/useLiveTasks';
import { useStartTask } from 'apps/dashboard/features/tasks/api/useStartTask';
import TaskProgress from 'apps/dashboard/features/tasks/components/TaskProgress';
import { TaskState } from '@jellyfin/sdk/lib/generated-client/models/task-state';
import Grid from '@mui/material/Grid';
import LibraryCard from 'apps/dashboard/features/libraries/components/LibraryCard';
import Loading from 'components/loading/LoadingComponent';
import MediaLibraryCreator from 'components/mediaLibraryCreator/mediaLibraryCreator';
import getCollectionTypeOptions from 'apps/dashboard/features/libraries/utils/collectionTypeOptions';
import { queryClient } from 'utils/query/queryClient';
import RefreshIcon from '@mui/icons-material/Refresh';
import Add from '@mui/icons-material/Add';

export const Component = () => {
    const { data: virtualFolders, isPending: isVirtualFoldersPending } = useVirtualFolders();
    const startTask = useStartTask();
    const { data: tasks, isPending: isLiveTasksPending } = useLiveTasks({ isHidden: false });

    const librariesTask = useMemo(() => (
        tasks?.find((value) => value.Key === 'RefreshLibrary')
    ), [ tasks ]);

    const showMediaLibraryCreator = useCallback(() => {
        const mediaLibraryCreator = new MediaLibraryCreator({
            collectionTypeOptions: getCollectionTypeOptions()
        }) as Promise<boolean>;

        void mediaLibraryCreator.then((hasChanges: boolean) => {
            if (hasChanges) {
                void queryClient.invalidateQueries({
                    queryKey: ['VirtualFolders']
                });
            }
        });
    }, []);

    const onScanLibraries = useCallback(() => {
        if (librariesTask?.Id) {
            startTask.mutate({
                taskId: librariesTask.Id
            });
        }
    }, [ startTask, librariesTask ]);


    const [libraryOrder, setLibraryOrderState] = useState<string[]>(getLibraryOrder());

    // Move library up or down in the order
    const moveLibrary = (name: string, direction: 'up' | 'down') => {
        const idx = libraryOrder.indexOf(name);
        if (idx === -1) return;
        const newOrder = [...libraryOrder];
        if (direction === 'up' && idx > 0) {
            [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
        } else if (direction === 'down' && idx < newOrder.length - 1) {
            [newOrder[idx + 1], newOrder[idx]] = [newOrder[idx], newOrder[idx + 1]];
        }
        setLibraryOrderState(newOrder);
        setLibraryOrder(newOrder);
    };

    // Initialize order if empty
    React.useEffect(() => {
        if (virtualFolders && libraryOrder.length === 0) {
            const names = virtualFolders.map(v => v.Name);
            setLibraryOrderState(names);
            setLibraryOrder(names);
        }
    }, [virtualFolders]);

    if (isVirtualFoldersPending || isLiveTasksPending) return <Loading />;

    // Sort libraries by global order, fallback to alphabetical
    let sortedFolders = virtualFolders ? [...virtualFolders] : [];
    if (libraryOrder && libraryOrder.length > 0) {
        sortedFolders.sort((a, b) => {
            const aIdx = libraryOrder.indexOf(a.Name);
            const bIdx = libraryOrder.indexOf(b.Name);
            if (aIdx === -1 && bIdx === -1) return a.Name.localeCompare(b.Name);
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
        });
    } else {
        sortedFolders.sort((a, b) => a.Name.localeCompare(b.Name));
    }

    return (
        <Page
            id='mediaLibraryPage'
            title={globalize.translate('HeaderLibraries')}
            className='mainAnimatedPage type-interior'
        >
            <Box className='content-primary'>
                <Stack spacing={3} mt={2}>
                    <Stack direction='row' alignItems={'center'} spacing={1.5}>
                        <Button
                            startIcon={<Add />}
                            onClick={showMediaLibraryCreator}
                        >
                            {globalize.translate('ButtonAddMediaLibrary')}
                        </Button>
                        <Button
                            onClick={onScanLibraries}
                            startIcon={<RefreshIcon />}
                            loading={librariesTask && librariesTask.State === TaskState.Running}
                            loadingPosition='start'
                            variant='outlined'
                        >
                            {globalize.translate('ButtonScanAllLibraries')}
                        </Button>
                        {(librariesTask && librariesTask.State == TaskState.Running) && (
                            <TaskProgress task={librariesTask} />
                        )}
                    </Stack>

                    {/* Admin UI: reorder libraries */}
                    <Box mb={2}>
                        <strong>Set Default Library Order (Admins):</strong>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {libraryOrder.map((name, idx) => (
                                <li key={name} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ flex: 1 }}>{name}</span>
                                    <IconButton size="small" onClick={() => moveLibrary(name, 'up')} disabled={idx === 0}>
                                        <ArrowUpwardIcon fontSize="inherit" />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => moveLibrary(name, 'down')} disabled={idx === libraryOrder.length - 1}>
                                        <ArrowDownwardIcon fontSize="inherit" />
                                    </IconButton>
                                </li>
                            ))}
                        </ul>
                    </Box>

                    <Box>
                        <Grid container spacing={2}>
                            {sortedFolders.map(virtualFolder => (
                                <Grid
                                    key={virtualFolder?.ItemId}
                                    item
                                    xs={12}
                                    sm={6}
                                    md={3}
                                    lg={2.4}
                                >
                                    <LibraryCard
                                        virtualFolder={virtualFolder}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </Stack>
            </Box>
        </Page>
    );
};

Component.displayName = 'LibrariesPage';
